import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class Create__Name__Dto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

export class Update__Name__Dto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}
