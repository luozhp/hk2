import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public, Roles, CurrentUser } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private svc: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: any) {
    return this.svc.login(body.email, body.password);
  }

  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.svc.me(userId);
  }

  @Post('change-password')
  changePassword(@CurrentUser('sub') userId: string, @Body() body: any) {
    return this.svc.changePassword(userId, body.oldPassword, body.newPassword);
  }

  @Roles('admin')
  @Get('users')
  users() {
    return this.svc.users();
  }

  @Roles('admin')
  @Post('users')
  createUser(@Body() body: any) {
    return this.svc.createUser(body);
  }

  @Roles('admin')
  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.svc.resetPassword(id);
  }

  @Roles('admin')
  @Post('users/:id/status')
  toggleStatus(@Param('id') id: string, @Body() body: any) {
    return this.svc.toggleStatus(id, body.status);
  }
}
