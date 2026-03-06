import { Body, Controller, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { PaymentsService, PackId } from './payments.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @Req() req: { user: { id: string; email: string } },
    @Body() body: { packId: PackId },
  ) {
    return this.paymentsService.createCheckoutSession(req.user.id, req.user.email, body.packId)
  }

  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() req: { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody!, signature)
  }
}
