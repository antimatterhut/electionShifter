declare module 'mapshaper' {
  const mapshaper: {
    applyCommands(
      commands: string,
      input: Record<string, Uint8Array | string>,
    ): Promise<Record<string, Uint8Array | string>>;
  };
  export default mapshaper;
}
