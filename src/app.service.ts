import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './users/user.schema';
import { Model } from 'mongoose';
import axios from 'axios';
import { JwtService } from '@nestjs/jwt';
import * as jwkToPem from "jwk-to-pem"

@Injectable()
export class AppService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>, private readonly jwtService: JwtService) { }

  async login({
    email, name, image
  }: {
    email: string;
    name: string;
    image: string
  }): Promise<any> {
    const user = await this.userModel.findOne({ email: email });
    if (!user) {
      const data = this.createUser({ email, name, image })
      return data
    }

    return user;
  }

  async createUser({
    email, name, image
  }: {
    email: string;
    name: string;
    image: string;
  }): Promise<User> {
    try {
      const newUser = new this.userModel({ email, name, image })
      await newUser.save()
      return newUser
    } catch (error) {
      console.error(error);
    }
  }

  async getPublicKey(kid: string): Promise<string> {
    const response = await axios.get(`${process.env.JWKS_URI}`)
    const data = response.data.keys
    const key = data.find(key => key.kid === kid);
    const publicKey = jwkToPem(key)

    return publicKey
  }

  async validateToken(
    token: string
  ): Promise<any> {
    const tokenParts = token.split('.')
    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
    const publicKey = await this.getPublicKey(header.kid)

    try {
      const verifiedToken = this.jwtService.verify(token, { publicKey })
      const user = await this.userModel.findOne({ email: verifiedToken.email });
      if (!user) {
        const data = this.createUser({ email: verifiedToken.email, name: verifiedToken.name, image: verifiedToken.picture })
        return data
      }

      return user
    } catch (error) {
      throw new UnauthorizedException("Invalid token: " + error.message)
    }
  }
}
