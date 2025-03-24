import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from "typeorm";
import { StreamModel } from "./command/stream";
  
  @Entity("stream_settings")
  export class StreamSettingsModel {
    @PrimaryGeneratedColumn("uuid")
    id: string;
  
    @ManyToOne(() => StreamModel, (stream) => stream.id, { nullable: false })
    @JoinColumn({ name: "stream_id" })
    stream: StreamModel;
  
    @Column({ name: "stream_id", type: "uuid", nullable: false })
    streamId: string;
  
    @Column({ type: "varchar", nullable: true })
    background: string;
  
    @Column({ type: "varchar", nullable: true })
    overlay: string;
  
    @Column({ type: "varchar", nullable: true })
    logo: string;
  
    @Column({ type: "varchar", default: "Default" })
    font: string;
  
    @Column("jsonb", { nullable: false, default: { name: "Default", bg: "bg-black/50", text: "text-white" } })
    theme: {
      name: string;
      bg: string;
      text: string;
    };
  
    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;
  
    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
  }