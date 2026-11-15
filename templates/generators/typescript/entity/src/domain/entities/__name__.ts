/**
 * __Name__ entity: business data and rules, free of frameworks.
 * Add the fields of your domain here, in the persistence entity and in the DTOs.
 */
export class __Name__ {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  rename(name: string): __Name__ {
    return new __Name__(this.id, name, this.createdAt, new Date());
  }
}

export interface Create__Name__Data {
  name: string;
}

export type Update__Name__Data = Partial<Create__Name__Data>;
