import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Exportado imperativamente para injetar indiretamente no AuthModule (jwt.strategy/auth.service)
})
export class UsersModule {}
