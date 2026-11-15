import { Create__Name__Data, __Name__, Update__Name__Data } from '../entities/__name__';

/** Persistence contract of __Name__; implemented in infrastructure. */
export interface __Name__Repository {
  findById(id: string): Promise<__Name__ | null>;
  findAll(): Promise<__Name__[]>;
  create(data: Create__Name__Data): Promise<__Name__>;
  update(id: string, data: Update__Name__Data): Promise<__Name__ | null>;
  delete(id: string): Promise<boolean>;
}
