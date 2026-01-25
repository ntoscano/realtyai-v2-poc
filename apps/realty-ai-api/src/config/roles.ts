export enum DbRoles {
	Author = 'author',
	Anon = 'anon',
	Super = 'super',
}

export function getRoleConfig() {
	return {
		defaultRole: DbRoles.Anon,
		authenticatedRole: DbRoles.Author,
		adminRole: DbRoles.Super,
	};
}
