# Theme (runtime)

Les modules headless consomment des **variables CSS** pour rester agnostiques du style.

## Variables (apres enregistrement admin)

| Variable | Usage |
|----------|--------|
| `--color-primary` | Boutons principaux |
| `--color-primary-foreground` | Texte sur primaire |
| `--color-background` / `--color-foreground` | Page |
| `--color-muted` / `--color-border` | Secondaire |
| `--color-success` / `--color-error` | Etats |
| `--font-sans` / `--font-heading` | Typo |
| `--space-base` | Base rem pour gaps |
| `--radius-sm` / `--radius-md` / `--radius-lg` | Rayons |
| `--focus-ring` / `--focus-ring-width` | Focus |
| `--hover-opacity` / `--disabled-opacity` | Interactif |

## Persistance

Table `theme_tokens` (id `default`), colonne `payload` JSON. Defauts dans `src/core/theme/types.ts` (`defaultThemeTokens`).

## Polices Google

Si le nom de police dans `font-sans` / `font-heading` est reconnu, `ThemeStyle` ajoute un `<link>` Google Fonts dans l admin.
