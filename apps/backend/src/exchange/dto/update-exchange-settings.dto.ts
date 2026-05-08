import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateExchangeSettingsDto {
  @IsOptional()
  @IsBoolean()
  isPaperTrading?: boolean;

  // 之後可以擴充其他設定
}
