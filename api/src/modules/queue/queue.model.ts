import {
    Model,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
} from "sequelize";
import { sequelize } from "../../db";
import { JobStatus } from "./queue.types";

export class Job extends Model<
    InferAttributes<Job>,
    InferCreationAttributes<Job>
> {
    declare id: CreationOptional<string>;

    declare type: string;
    declare payload: object;

    declare status: CreationOptional<JobStatus>;
    declare attempts: CreationOptional<number>;
    declare max_attempts: CreationOptional<number>;

    declare run_at: CreationOptional<Date>;
    declare locked_at: CreationOptional<Date | null>;
    declare last_error: CreationOptional<string | null>;

    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;
}

Job.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        payload: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: "pending"
        },
        attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        max_attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 3
        },
        run_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        locked_at: DataTypes.DATE,
        last_error: DataTypes.TEXT,
        created_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
    },
    {
        sequelize,
        tableName: "jobs",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);
