import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'owner@forsee.example', type: String })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'demo1234', minLength: 8, type: String })
  @IsString()
  @MinLength(8)
  password!: string;
}
