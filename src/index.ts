import { Auth } from "./Auth/auth";
import { ElectronAuthClient } from "./electronAuth";
import { DeepLinkAuthClient } from "./deepLink";
import { Criticity, Log } from "@orosound/log";

/** Set log file path *********************************************************/
Log.setupLog({
  color: true,
  time: true,
  verbose: Criticity.DEBUG,
  path: "./logs",
});

export { Auth, ElectronAuthClient, DeepLinkAuthClient };
