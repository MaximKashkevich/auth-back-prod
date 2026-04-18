import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import RedisStore from 'connect-redis'
import session from 'express-session'
import IORedis from 'ioredis'

import { AppModule } from './app.module'
import { ms, StringValue } from './libs/common/utils/ms.util'
import { parseBoolean } from './libs/common/utils/parse-boolean.util'

// Используем require для проблемных CJS модулей, чтобы избежать TypeError в рантайме
const cookieParser = require('cookie-parser')

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	const config = app.get(ConfigService)

	// В Docker сети используем имя сервиса или 0.0.0.0, если Redis в том же стеке
	const redis = new IORedis(config.getOrThrow('REDIS_URI'))

	// Теперь это сработает без ошибок
	app.use(cookieParser(config.getOrThrow<string>('COOKIES_SECRET')))

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true
		})
	)

	app.use(
		session({
			secret: config.getOrThrow<string>('SESSION_SECRET'),
			name: config.getOrThrow<string>('SESSION_NAME'),
			resave: true,
			saveUninitialized: false,
			cookie: {
				domain: config.getOrThrow<string>('SESSION_DOMAIN'),
				maxAge: ms(config.getOrThrow<StringValue>('SESSION_MAX_AGE')),
				httpOnly: parseBoolean(
					config.getOrThrow<string>('SESSION_HTTP_ONLY')
				),
				secure: parseBoolean(
					config.getOrThrow<string>('SESSION_SECURE')
				),
				sameSite: 'lax'
			},
			store: new RedisStore({
				client: redis,
				prefix: config.getOrThrow<string>('SESSION_FOLDER')
			})
		})
	)

	app.enableCors({
		origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
		credentials: true,
		exposedHeaders: ['set-cookie']
	})

	// КРИТИЧЕСКИ ВАЖНО для Docker: слушаем 0.0.0.0
	const port = config.getOrThrow<number>('APPLICATION_PORT')
	await app.listen(port, '0.0.0.0')

	console.log(`Application is running on: http://0.0.0.0:${port}`)
}
bootstrap()
