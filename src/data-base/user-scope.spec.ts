import { scopeArgs } from './user-scope';

describe('scopeArgs', () => {
  it('adds user_id to where on reads, updates and deletes', () => {
    for (const op of ['findMany', 'findUnique', 'count', 'update', 'delete']) {
      expect(scopeArgs('Account', op, { where: { id: 'a' } }, 'u1')).toEqual({
        where: { id: 'a', user_id: 'u1' },
      });
    }
  });

  it('creates a where when none is given', () => {
    expect(
      scopeArgs('Account', 'findMany', { omit: { x: true } }, 'u1'),
    ).toEqual({ omit: { x: true }, where: { user_id: 'u1' } });
  });

  it('overrides a caller-supplied user_id', () => {
    expect(
      scopeArgs('Account', 'findMany', { where: { user_id: 'other' } }, 'u1'),
    ).toEqual({ where: { user_id: 'u1' } });
  });

  it('sets user_id on create, createMany and upsert', () => {
    expect(
      scopeArgs('Account', 'create', { data: { name: 'x' } }, 'u1'),
    ).toEqual({ data: { name: 'x', user_id: 'u1' } });
    expect(
      scopeArgs(
        'Account',
        'createMany',
        { data: [{ name: 'a' }, { name: 'b' }] },
        'u1',
      ),
    ).toEqual({
      data: [
        { name: 'a', user_id: 'u1' },
        { name: 'b', user_id: 'u1' },
      ],
    });
    expect(
      scopeArgs(
        'Account',
        'upsert',
        { where: { id: 'a' }, create: { name: 'x' }, update: {} },
        'u1',
      ),
    ).toEqual({
      where: { id: 'a', user_id: 'u1' },
      create: { name: 'x', user_id: 'u1' },
      update: {},
    });
  });

  it('leaves models that are not user-owned untouched', () => {
    const args = { where: { code: 'NGN' } };
    expect(scopeArgs('Currency', 'findUnique', args, undefined)).toBe(args);
    expect(scopeArgs('User', 'findUnique', args, 'u1')).toBe(args);
  });

  it('fails closed without a user', () => {
    expect(() => scopeArgs('Account', 'findMany', {}, undefined)).toThrow(
      /requires an authenticated user context/,
    );
  });

  it('fails closed on unknown operations', () => {
    expect(() => scopeArgs('Account', 'somethingNew', {}, 'u1')).toThrow(
      /not user-scoped/,
    );
  });
});
