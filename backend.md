# Nota backend

Nota backend - серверная часть приложения для личных заметок, потоков тем и
чатового сценария быстрого сохранения мыслей. Приложение помогает пользователю
создавать Markdown-заметки, группировать их по потокам, искать похожие заметки и
превращать сообщения из чата в структурированные записи.

## Назначение приложения

Nota решает задачу быстрого сбора и последующей навигации по личной информации.
Основные сущности приложения:

- Пользователь - владелец всех заметок, потоков и чатов.
- Поток - пользовательская тема, категория или контекст: `work`, `personal`,
  `project alpha`.
- Заметка - Markdown-запись с plain-text представлением для поиска и коротким
  preview.
- Связь заметки и потока - одна заметка может принадлежать нескольким потокам.
- Чат - интерфейс быстрого ввода. Сообщение в чате сохраняется как исходное
  сообщение и одновременно создает заметку.

## Технологический стек

- Runtime: Node.js, TypeScript, ES2023.
- Backend framework: NestJS 11.
- Database: PostgreSQL.
- ORM: Prisma 7 с `@prisma/adapter-pg`.
- Auth: JWT access token, refresh token в HttpOnly cookie, Passport JWT.
- Password hashing: Argon2.
- Validation: `class-validator`, `class-transformer`, глобальный
  `ValidationPipe`.
- API docs: Swagger/OpenAPI через `@nestjs/swagger`.
- Search: PostgreSQL full-text search для русского, английского и `simple`
  словарей, плюс `pg_trgm` для trigram similarity.
- Pagination: cursor pagination с base64url cursor.
- Tooling: Nest CLI, ESLint, Prettier, Jest.

## Архитектура проекта

```text
src/
  core/
    app.module.ts          # корневой Nest module
    config/                # env, JWT, Swagger config
    prisma/                # PrismaService и сгенерированный клиент
    swagger/               # подключение Swagger UI
  modules/
    auth/                  # регистрация, вход, refresh, текущий пользователь
    stream/                # CRUD потоков и поиск похожих потоков
    note/                  # CRUD заметок и поиск похожих заметок
    note-stream/           # привязка заметок к потокам
    chat/                  # чаты и создание заметок из сообщений
  shared/
    pagination/            # cursor pagination
    similar-search/        # общие лимиты похожего поиска
prisma/
  schema.prisma            # доменная схема БД
  migrations/              # SQL-миграции, индексы и расширения PostgreSQL
```

Приложение запускается с глобальным префиксом `/api`. Swagger UI доступен по
адресу `/api/docs`, JSON-документ - по `/swagger.json`.

## База данных

Prisma-схема описывает следующие ключевые таблицы:

- `users` - пользователи, login, password hash, timestamps.
- `streams` - пользовательские потоки. Имя нормализуется через trim,
  схлопывание пробелов и lowercase; уникальность проверяется в рамках одного
  пользователя.
- `notes` - заметки с `body_markdown`, `body_text`, `preview_text`,
  `search_vector`, `source_type`, `source_meta`.
- `note_streams` - many-to-many связь заметок и потоков.
- `chats` - общий чат пользователя или чат, привязанный к конкретному потоку.
  В БД ограничено: один общий чат на пользователя и один чат на пару
  пользователь-поток.
- `chat_messages` - сообщения чата.
- `message_results` - результат обработки сообщения: созданная заметка и
  потоки, созданные во время обработки.
- `auth_identities`, `sessions`, `telegram_link_tokens` - схема заложена под
  расширение авторизации и Telegram-сценарии. Текущие публичные контроллеры
  используют password/JWT flow.

Миграции дополнительно создают:

- расширение `pg_trgm`;
- case-insensitive unique index по `lower(login)`;
- GIN index по `notes.search_vector`;
- trigram GIN index по `notes.body_text`;
- trigger, который синхронизирует `notes.search_vector` при изменении
  `body_text`;
- partial indexes для активных заметок.

## Авторизация и безопасность

Регистрация и вход возвращают `accessToken` в теле ответа и выставляют
`refreshToken` в HttpOnly cookie.

Защищенные endpoints требуют заголовок:

```http
Authorization: Bearer <accessToken>
```

Refresh endpoint читает cookie `refreshToken` и выдает новую пару токенов.
Cookie выставляется с `sameSite=lax`; флаг `secure` включается вне development
окружения. CORS включен с `credentials: true`.

Пароли хешируются Argon2. Вход возвращает одинаковую ошибку `User was not found`
и при отсутствии пользователя, и при неверном пароле.


## Пользовательские сценарии

### 1. Регистрация и начало работы

Пользователь регистрируется через `/auth/sign-up`, получает `accessToken`,
клиент сохраняет его для `Authorization` header, а refresh token хранится в
HttpOnly cookie.

### 2. Ручная организация знаний

Пользователь создает потоки: `work`, `study`, `personal`. Затем создает заметки
через `/note` и передает `streamIds`, чтобы разложить их по контекстам.

### 3. Навигация по заметкам

Пользователь открывает список всех заметок через `/note` или заметки конкретного
потока через `/stream/:streamId/notes`. При прокрутке клиент передает
`page.nextCursor` для следующей страницы.

### 4. Быстрое сохранение через чат

Пользователь открывает общий чат или чат потока и отправляет сообщение:

```text
:work
Проверить договор и отправить правки завтра.
```

Приложение автоматически создает заметку, создает поток `work`, если его еще не
было, и связывает заметку с этим потоком.

### 5. Поиск похожих материалов

Пользователь вводит поисковую фразу. Backend возвращает наиболее похожие
заметки или потоки, используя полнотекстовый поиск и fuzzy matching. Это
подходит для сценариев "найди похожие идеи", "покажи близкие темы", "не дай
создать дубль потока".

### 6. Переразметка заметок

Пользователь может привязать заметку к дополнительному потоку или убрать связь
через `/stream/:streamId/notes/:noteId`, не меняя саму заметку.

### 7. Telegram-сценарий как направление расширения

В схеме уже есть `AuthProvider.TELEGRAM`, `NoteSourceType.TELEGRAM` и таблица
`telegram_link_tokens`. Это позволяет расширить приложение до сценария, где
заметки приходят из Telegram-бота. На уровне текущих контроллеров Telegram API
еще не реализован.

## Ошибки и статусы

Типичные ответы:

- `400 Bad Request` - ошибка валидации, неверный cursor, пустое тело заметки
  после обработки сервисных строк.
- `401 Unauthorized` - отсутствует или неверен access token.
- `404 Not Found` - пользовательский ресурс не найден или не принадлежит
  текущему пользователю.
- `409 Conflict` - дубликат пользователя, потока или чата.