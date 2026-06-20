import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { SignUpRequestDto } from './dto/sign-up.dto';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { SignInRequestDto } from './dto/sign-in.dto';
import { type Request, type Response, type CookieOptions } from 'express';
import { isDev } from '@shared/utils/is-dev.util';
import type { JwtPayload } from './interfaces/jwt.interface';
import type { StringValue } from 'ms';
import { buildNoteContentFields } from '@modules/note/utils/note-content.util';

const ONBOARDING_STREAM_NAME = 'Добро пожаловать';
const ONBOARDING_STREAM_NORMALIZED_NAME = 'добро пожаловать';

const ONBOARDING_NOTE_NOTA = `# Приложение Nota

Nota — это пространство для мыслей, где заметки рождаются в разговоре.

## Как это работает

Общайся с чатом как обычно — пиши мысли, идеи, задачи. Nota автоматически превращает сообщения в заметки и помогает их организовать.

## Потоки

Потоки — это категории для заметок. Чтобы привязать заметку к потоку прямо в сообщении, используй синтаксис \`:название потока\`.

Например: \n\`Купить молоко\` \n\`:покупки\`\n
создаст заметку и добавит её в поток «покупки». Если потока ещё нет — он создастся автоматически.

## Создание заметок

Заметки можно создавать через чат или напрямую в редакторе. Поддерживается Markdown — форматируй текст так, как тебе удобно.`;

const ONBOARDING_NOTE_MARKDOWN = `# Markdown в Nota

Nota поддерживает Markdown — простой способ форматировать текст прямо в редакторе.

## Заголовки

Используй символ \`#\` перед текстом. Чем больше символов — тем меньше заголовок:

\`# Заголовок 1\`
\`## Заголовок 2\`
\`### Заголовок 3\`

Доступны уровни от 1 до 6.

## Списки

Ненумерованный — начни строку с \`-\`:

- Первый пункт
- Второй пункт

Нумерованный — начни строку с \`1.\`:

1. Первый пункт
2. Второй пункт

## Форматирование текста

**Жирный** — оберни текст в \`**двойные звёздочки**\`

_Курсив_ — оберни текст в \`_подчёркивания_\`

\`Inline-код\` — оберни текст в обратные кавычки \` \` \``;

@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_TTL: StringValue;
  private readonly JWT_REFRESH_TTL: StringValue;
  private readonly COOKIE_DOMAIN: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.JWT_ACCESS_TTL = this.config.getOrThrow('JWT_ACCESS_TTL');
    this.JWT_REFRESH_TTL = this.config.getOrThrow('JWT_REFRESH_TTL');
    this.COOKIE_DOMAIN = this.config.getOrThrow('COOKIE_DOMAIN');
  }

  async signUp(res: Response, dto: SignUpRequestDto) {
    const { login, password } = dto;

    const existUser = await this.prisma.user.findUnique({ where: { login } });

    if (existUser) {
      throw new ConflictException('User with this login is already esists');
    }

    const passwordHash = await hash(password);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          login,
          passwordHash,
        },
        select: {
          id: true,
        },
      });

      const stream = await tx.stream.create({
        data: {
          userId: createdUser.id,
          name: ONBOARDING_STREAM_NAME,
          normalizedName: ONBOARDING_STREAM_NORMALIZED_NAME,
        },
        select: {
          id: true,
        },
      });

      await tx.note.createMany({
        data: [
          {
            userId: createdUser.id,
            ...buildNoteContentFields(ONBOARDING_NOTE_NOTA),
          },
          {
            userId: createdUser.id,
            ...buildNoteContentFields(ONBOARDING_NOTE_MARKDOWN),
          },
        ],
      });

      const createdNotes = await tx.note.findMany({
        where: { userId: createdUser.id },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      await tx.noteStream.createMany({
        data: createdNotes.map((note) => ({
          noteId: note.id,
          streamId: stream.id,
        })),
      });

      return createdUser;
    });

    return this.auth(res, user.id);
  }

  async signIn(res: Response, dto: SignInRequestDto) {
    const { login, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { login },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundException('User was not found');
    }

    const isValidPassword = await verify(user.passwordHash, password);

    if (!isValidPassword) {
      throw new NotFoundException('User was not found');
    }

    return this.auth(res, user.id);
  }

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies['refreshToken'] as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('invalid refresh token');
    }

    const payload: JwtPayload = await this.jwtService.verifyAsync(refreshToken);
    if (payload) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException('User was not found');
      }

      return this.auth(res, user.id);
    }
  }

  logout(res: Response) {
    this.clearCookie(res);

    return true;
  }

  async validate(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private auth(res: Response, id: string) {
    const { accessToken, refreshToken } = this.generateTokens(id);
    this.setCookie(res, refreshToken, new Date(Date.now() + 60 * 60 * 24 * 7)); // Грамотно перенести в .env
    return { accessToken };
  }

  private generateTokens(id: string) {
    const payload: JwtPayload = { id };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_ACCESS_TTL,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_REFRESH_TTL,
    });

    return { accessToken, refreshToken };
  }

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      domain:
        this.COOKIE_DOMAIN === 'localhost' ? undefined : this.COOKIE_DOMAIN,
      secure: !isDev(this.config),
      sameSite: 'lax',
    };
  }

  private setCookie(res: Response, value: string, expires: Date) {
    res.cookie('refreshToken', value, {
      ...this.getCookieOptions(),
      expires,
    });
  }

  private clearCookie(res: Response) {
    res.clearCookie('refreshToken', this.getCookieOptions());
  }
}
