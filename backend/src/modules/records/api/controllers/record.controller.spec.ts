import { Test, TestingModule } from '@nestjs/testing';
import { RecordController } from './record.controller';
import { IRecordService } from '../../application/interfaces/irecord.service';

describe('RecordController', () => {
  let controller: RecordController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordController],
      providers: [{ provide: IRecordService, useValue: {} }],
    }).compile();

    controller = module.get<RecordController>(RecordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
