import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { OAuth2Client } from 'google-auth-library';
import { Response } from 'express';
import axios from 'axios';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Post('/login')
  async login(@Body('token') token): Promise<any> {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    // log the ticket payload in the console to see what we have
    console.log(ticket.getPayload(), 'ticket');
    const { email, name, picture } = ticket.getPayload();
    const data = await this.appService.login({ email, name, image: picture });
    return {
      data, message: 'success.'
    }
  }

  @Get("/callback")
  async handleCallback(@Query("code") code: string, @Res() res: Response) {
    try {
      const tokenResponse = await axios.post(process.env.TOKEN_URL, {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.API_URL}/callback`
      });

      const { access_token, id_token } = tokenResponse.data

      res.cookie('access_token', access_token, {
        httpOnly: false,
        secure: true,
        maxAge: 3600 * 1000  // in ms
      })

      res.cookie('id_token', id_token, {
        httpOnly: false,
        secure: true,
        maxAge: 3600 * 1000 // in ms
      })

      res.redirect(process.env.CLIENT_URL)
    } catch (error) {
      console.error(error);
    }
  }

  @Get("/verify")
  async verify(@Query('token') token: string): Promise<any> {
    try {
      const data = await this.appService.validateToken(token)
      return {
        data: data,
        message: "success"
      }
    } catch (error) {
      console.error(error);
    }
  }
}
