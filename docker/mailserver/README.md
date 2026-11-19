# Docker Mailserver Configuration Directory

This directory is mounted to `/tmp/docker-mailserver` inside the mailserver container.

### Useful Commands:
Add an email account:
```bash
docker compose exec mailserver setup email add postmaster@rifthero.gg <password>
```

Add an alias:
```bash
docker compose exec mailserver setup alias add support@rifthero.gg postmaster@rifthero.gg
```

Generate DKIM keys:
```bash
docker compose exec mailserver setup config dkim
```
