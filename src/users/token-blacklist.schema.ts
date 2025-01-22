import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type TokenBlacklistsDocument = TokenBlacklists & Document

@Schema()
export class TokenBlacklists {
    @Prop()
    user_id: string;

    @Prop()
    token: string
}

export const TokenBlacklistsSchema = SchemaFactory.createForClass(TokenBlacklists)