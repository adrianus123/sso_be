import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './users/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { TokenBlacklists, TokenBlacklistsSchema } from './users/token-blacklist.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    JwtModule.register({
      global: true
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }, { name: TokenBlacklists.name, schema: TokenBlacklistsSchema }])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
