import { Test, TestingModule } from '@nestjs/testing';
import { RwcdsFormController } from './rwcds-form.controller';
import { CrmModule } from '../../crm/crm.module';

describe('RwcdsForm Controller', () => {
  let controller: RwcdsFormController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CrmModule],
      controllers: [RwcdsFormController],
    }).compile();

    controller = module.get<RwcdsFormController>(RwcdsFormController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
