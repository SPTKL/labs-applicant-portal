import { Controller,
  Res,
  Get,
} from '@nestjs/common';
import { CrmService } from '../crm/crm.service';

@Controller('document')
export class DocumentController {
  constructor(
    private readonly crmService: CrmService,
  ) {}

  @Get('/download/')
  async getDocument(@Res() response) {
    let getDocResponse = await this.crmService.getDocument();
    response.status(200).send({"message": getDocResponse});
  }
}
