import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Room",
  tableName: "rooms",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    code: {
      type: "varchar",
      unique: true,
    },
    participants: {
      type: "simple-json",
      nullable: false,
    },
    topics: {
      type: "simple-json",
      nullable: false,
    },
    isLocked: {
      type: "boolean",
      default: false,
    },
    currentTurn: {
      type: "varchar",
      nullable: true,
    },
    selectedTopic: {
      type: "varchar",
      nullable: true,
    },
    lastActiveAt: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
      onUpdate: () => "CURRENT_TIMESTAMP",
    },
  },
});
