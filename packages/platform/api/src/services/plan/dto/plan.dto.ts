import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePlanDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdatePlanDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class PlanResponseDto {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}