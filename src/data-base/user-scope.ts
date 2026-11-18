// Models whose rows belong to a single user. Every query on them gets
// user_id from the request context, so services never pass it by hand.
// User/Session/MagicLinkToken are deliberately excluded: auth looks them up
// across users (by email or token hash) before anyone is signed in.
//
// Not covered: $queryRaw/$executeRaw and nested relation writes
// (e.g. user.update({ data: { accounts: { create } } })) — scope those manually.
export const USER_OWNED_MODELS = new Set<string>(['Account']);

const WHERE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
]);

type Args = Record<string, unknown>;

export function scopeArgs(
  model: string,
  operation: string,
  args: Args,
  userId: string | undefined,
): Args {
  if (!USER_OWNED_MODELS.has(model)) return args;
  if (!userId) {
    throw new Error(
      `${model}.${operation} requires an authenticated user context`,
    );
  }

  const where = { ...(args.where as Args | undefined), user_id: userId };
  const withUser = (data: unknown) => ({ ...(data as Args), user_id: userId });

  if (WHERE_OPERATIONS.has(operation)) return { ...args, where };

  switch (operation) {
    case 'create':
      return { ...args, data: withUser(args.data) };
    case 'createMany':
    case 'createManyAndReturn':
      return {
        ...args,
        data: Array.isArray(args.data)
          ? args.data.map(withUser)
          : withUser(args.data),
      };
    case 'upsert':
      return { ...args, where, create: withUser(args.create) };
    default:
      // Fail closed on anything new rather than run it unscoped.
      throw new Error(`${model}.${operation} is not user-scoped`);
  }
}
