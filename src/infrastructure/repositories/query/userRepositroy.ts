import mongoose from "mongoose";
import UserModel, { User } from "../../models/query/user";
import { IUserRepository } from "../../../application/interface/query/IUserQueryRepository";

export class UserRepository implements IUserRepository {
  async create(user: Partial<User>): Promise<User> {
    console.log(user, "userData in repository");
    if (user._id && typeof user._id === "string") {
      user._id = new mongoose.Types.ObjectId(user._id);
    }
    const newUser = new UserModel(user);
    console.log(newUser, "newUser in repository");

    return await newUser.save();
  }

  async findByEmail(email: string): Promise<User | null> {
    return await UserModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return await UserModel.findById(id).exec();
  }

  async updateRoleByEmail(
    email: string,
    updateData: Partial<User>
  ): Promise<User | null> {
    console.log(email, updateData, "in the repository update by email");

    const updatedUser = await UserModel.findOneAndUpdate(
      { email },
      { $set: updateData },
      { new: true }
    ).exec();
    return updatedUser;
  }

  async updateById(
    id: string,
    updateData: Partial<User>
  ): Promise<User | null> {
    return await UserModel.findByIdAndUpdate(id, updateData, {
      new: true,
    }).exec();
  }
}
