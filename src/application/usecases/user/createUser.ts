import { RabbitMQConnection, RabbitMQProducer } from "streamrx_common";
import { UserEntity } from "../../../domain/entities/user";
import { IUserRepository } from "../../interface/IUserRepository";

export class CreateUser {


  constructor(private userRepository: IUserRepository) {}

  async execute(userData: UserEntity): Promise<UserEntity> {
    const user = new UserEntity(userData);
    console.log(user, " user in the user case of creating ");
    return await this.userRepository.createUser(user);
  }
} 
