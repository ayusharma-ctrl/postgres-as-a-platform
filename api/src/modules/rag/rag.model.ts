import {
    Model,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
} from "sequelize";
import { sequelize } from "../../db";


export class RagDocument extends Model<
    InferAttributes<RagDocument>,
    InferCreationAttributes<RagDocument>
> {
    declare id: CreationOptional<string>;
    declare file_name: string;
    declare mime_type: string;
    declare file_hash: string;
    declare status: "pending" | "processing" | "done" | "failed";
    declare total_chunks: CreationOptional<number>;
    declare error_message: CreationOptional<string | null>;
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;
}

export class RagChunk extends Model<
    InferAttributes<RagChunk>,
    InferCreationAttributes<RagChunk>
> {
    declare id: CreationOptional<string>;
    declare doc_id: string;
    declare chunk_index: number;
    declare content: string;
    declare page_number: CreationOptional<number | null>;
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;
}

RagDocument.init(
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        file_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        mime_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        file_hash: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "pending",
        },
        total_chunks: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        error_message: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: "rag_documents",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

RagChunk.init(
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        doc_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'rag_documents',
                key: 'id',
            },
        },
        chunk_index: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        content: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        page_number: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: "rag_chunks",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

RagChunk.belongsTo(RagDocument, {
    foreignKey: 'doc_id',
    targetKey: 'id',
    as: 'document',
});

RagDocument.hasMany(RagChunk, {
    foreignKey: 'doc_id',
    sourceKey: 'id',
    as: 'chunks',
});
