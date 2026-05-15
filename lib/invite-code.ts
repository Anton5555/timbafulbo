import { customAlphabet } from "nanoid"

/** Excludes 0/O/1/I for readability in shared codes. */
const INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

const inviteSuffix = customAlphabet(INVITE_ALPHABET, 4)

/**
 * Generates `TMB-XXXX` and checks uniqueness via `isTaken`.
 * @throws When no free code is found after several attempts.
 */
export async function generateUniqueInviteCode(
  isTaken: (code: string) => Promise<boolean>
): Promise<string> {
  for (let i = 0; i < 24; i++) {
    const code = `TMB-${inviteSuffix()}`
    if (!(await isTaken(code))) {
      return code
    }
  }
  throw new Error("No se pudo generar un código de invitación único.")
}
