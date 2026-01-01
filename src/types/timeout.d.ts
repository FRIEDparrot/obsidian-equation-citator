// TypeScript global type for NodeJS.Timeout
// This allows using 'Timeout' as a type for setTimeout/clearTimeout variables

type Timeout = ReturnType<typeof setTimeout>;
