import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { DocumentController } from './document.controller';

@Module({
  imports: [
    CrmModule,
  ],
  controllers: [DocumentController]
})
export class DocumentModule { 
}
