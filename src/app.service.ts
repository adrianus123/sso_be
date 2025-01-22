import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './users/user.schema';
import { Model } from 'mongoose';
import axios from 'axios';
import { JwtService } from '@nestjs/jwt';
import * as jwkToPem from 'jwk-to-pem';
import {
  TokenBlacklists,
  TokenBlacklistsDocument,
} from './users/token-blacklist.schema';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(TokenBlacklists.name)
    private readonly tokenBlacklistModel: Model<TokenBlacklistsDocument>,
    private readonly jwtService: JwtService,
  ) { }

  async login({
    email,
    name,
    image,
  }: {
    email: string;
    name: string;
    image: string;
  }): Promise<any> {
    const user = await this.getUser(email);
    if (!user) {
      const data = this.createUser({ email, name, image });
      return data;
    }

    return user;
  }

  async getUser(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email: email });
    return user;
  }

  async createUser({
    email,
    name,
    image,
  }: {
    email: string;
    name: string;
    image: string;
  }): Promise<User> {
    try {
      const newUser = new this.userModel({ email, name, image });
      await newUser.save();
      return newUser;
    } catch (error) {
      console.error(error);
    }
  }

  async getPublicKey(kid: string): Promise<string> {
    const response = await axios.get(`${process.env.JWKS_URI}`);
    const data = response.data.keys;
    const key = data.find((key) => key.kid === kid);
    const publicKey = jwkToPem(key);

    return publicKey;
  }

  async validateToken(token: string): Promise<any> {
    const tokenParts = token.split('.');
    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
    const publicKey = await this.getPublicKey(header.kid);

    try {
      const tokenBlacklist = await this.tokenBlacklistModel.findOne({ token })
      if (tokenBlacklist) {
        throw new UnauthorizedException('Token blacklisted.');
      }

      const verifiedToken = this.jwtService.verify(token, { publicKey });
      const user = await this.getUser(verifiedToken.email);
      if (!user) {
        const data = this.createUser({
          email: verifiedToken.email,
          name: verifiedToken.name,
          image: verifiedToken.picture,
        });
        return data;
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token: ' + error.message);
    }
  }

  async revokeToken(token: string): Promise<any> {
    try {
      const user = await this.validateToken(token)
      const tokenBlacklist = new this.tokenBlacklistModel({ user_id: user._id, token: token })
      await tokenBlacklist.save()

      return "success"
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
