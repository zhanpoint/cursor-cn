declare var process: any;
declare var console: any;
declare var Buffer: any;
declare function fetch(input: any, init?: any): Promise<any>;

declare module "node:fs" {
  const fs: any;
  export = fs;
}
declare module "node:path" {
  const path: any;
  export = path;
}
declare module "node:os" {
  const os: any;
  export = os;
}
declare module "node:crypto" {
  const crypto: any;
  export = crypto;
}
declare module "node:zlib" {
  const zlib: any;
  export = zlib;
}
declare module "node:readline" {
  const readline: any;
  export = readline;
}
declare module "node:child_process" {
  export const spawn: any;
  export const spawnSync: any;
}
