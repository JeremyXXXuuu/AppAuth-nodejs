import { Auth } from "./Auth/auth";
import { AppAuthClient } from "./appAuthClient";
import { AuthClient } from "./authClient";
import { Criticity, Log } from "@orosound/log";

/** Set log file path *********************************************************/
Log.setupLog({
  color: true,
  time: true,
  verbose: Criticity.DEBUG,
  path: "./logs",
});

export { Auth, AppAuthClient, AuthClient };
