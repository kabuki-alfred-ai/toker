import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats()
  }

  @Get('users')
  getUsers(@Query('page') page?: string, @Query('search') search?: string) {
    return this.adminService.getUsers(page ? parseInt(page, 10) : 1, search ?? '')
  }

  @Get('jobs')
  getJobs(@Query('page') page?: string, @Query('status') status?: string) {
    return this.adminService.getJobs(page ? parseInt(page, 10) : 1, status)
  }
}
