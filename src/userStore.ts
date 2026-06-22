import bcrypt from "bcrypt";
import { database } from "./db.js";

export interface User {
  id: number;
  email: string;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
}

const insertUser = database.prepare(
  "INSERT INTO users (email, password_hash) VALUES (?, ?)"
);
const findByEmail = database.prepare("SELECT * FROM users WHERE email = ?");

// Thrown when registering an email that already exists.
export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("EmailAlreadyExists");    //super is used to call the constructor of the Error class to provide a custom error message
    this.name = "EmailAlreadyExistsError"; // this is used to set the name of the error
  }
}
// to create a new user
export async function createUser(
  email: string,
  password: string
): Promise<User> {
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const info = insertUser.run(email, passwordHash); //Sending passwordHash instead of actual password to avoid storing the password in the database
    return { id: Number(info.lastInsertRowid), email };
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      throw new EmailAlreadyExistsError();
    }
    throw err;
  }
}
// to verify a user
export async function verifyUser(
  email: string,
  password: string
): Promise<User | null> {
  const row = findByEmail.get(email) as UserRow | undefined;
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  return ok ? { id: row.id, email: row.email } : null;
}