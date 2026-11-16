export type Dict = Readonly<Record<string, string>>;

/** Where a key comes from: 'data' = game data tables, 'ui' = screens and messages */
export type Domain = 'ui' | 'data';

export type DictParts = Readonly<Record<Domain, Dict>>;
