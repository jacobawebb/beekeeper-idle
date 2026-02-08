import Dexie, { Table } from "dexie";

export type IdentityRecord = {
  key: "primary";
  userId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  createdAt: number;
};

export type SaveRecord = {
  key: "primary";
  state: unknown;
  updatedAt: number;
};

class BeekeeperDb extends Dexie {
  identity!: Table<IdentityRecord, string>;
  saves!: Table<SaveRecord, string>;

  constructor() {
    super("beekeeper-idle");
    this.version(1).stores({
      identity: "key",
      saves: "key",
    });
  }
}

export const db = new BeekeeperDb();
