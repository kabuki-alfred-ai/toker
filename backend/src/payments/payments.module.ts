import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { AuthModule } from '../auth/auth.module'
import { EmailModule } from '../common/email/email.module'

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
