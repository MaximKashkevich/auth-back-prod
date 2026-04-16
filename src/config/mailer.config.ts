import { MailerOptions } from '@nestjs-modules/mailer'
import { ConfigService } from '@nestjs/config'

export const getMailerConfig = async (
	configService: ConfigService
): Promise<MailerOptions> => ({
	transport: {
		host: 'smtp.resend.com',
		port: 587,
		secure: false, // используем STARTTLS (рекомендуется Resend)
		auth: {
			user: 'resend',
			pass: configService.get<string>('MAIL_KEY')
		}
	},
	defaults: {
		from: 'onboarding@resend.dev'
	}
})
