#!/usr/bin/env bash
# Ships this commit's static export to the server. deploy.yml runs it on main, after the build.
# The server (dm3yb/infra server/release.sh) makes it a release and switches nginx to it.
# Roll back by hand: ssh aerixity-deploy '/srv/infra/server/deploy release dither-studio <sha>-<run>'
# A bare <sha> picks that commit's newest build.
set -euo pipefail

NAME=dither-studio
URL=https://dither-studio.aerixity.com
ID=$GITHUB_SHA-$GITHUB_RUN_NUMBER # a rebuild of the same commit is a new release

# 1. The release folder: the static export in out/ (with version.txt for step 5), nginx.conf
#    and RELEASE.
echo "==> Release folder"
rm -rf release
mkdir -p release/out
cp -a out/. release/out/
echo "$ID" >release/out/version.txt
cp deploy/nginx.conf release/nginx.conf
echo "$ID" >release/RELEASE

# 2. SSH: the deploy key, the server's pinned host key, and `target` as the server's name.
echo "==> SSH"
install -d -m 700 ~/.ssh
echo "$DEPLOY_SSH_KEY" >~/.ssh/deploy
chmod 600 ~/.ssh/deploy
echo "$DEPLOY_KNOWN_HOSTS" >~/.ssh/known_hosts
cat >~/.ssh/config <<EOF
Host target
  HostName $DEPLOY_HOST
  User $DEPLOY_USER
  IdentityFile ~/.ssh/deploy
  IdentitiesOnly yes
  BatchMode yes
EOF

# 3. Upload into /srv/incoming/dither-studio. --checksum leaves unchanged files alone, so
#    releases share them as hard links on the server.
echo "==> Upload"
rsync -a --delete --checksum release/ "target:$NAME/"

# 4. Make it live. The arguments go to the server's forced command, so they expand here.
echo "==> Deploy $ID"
# shellcheck disable=SC2029
ssh target release "$NAME" "$ID" </dev/null

# 5. Through Cloudflare: /version.txt reports this release, and the home page answers.
echo "==> Check $URL"
live=$(curl -fsS -m 10 "$URL/version.txt?r=$GITHUB_RUN_ID")
if [[ $live != "$ID" ]]; then
  echo "ERROR: $URL/version.txt is $live, expected $ID" >&2
  exit 1
fi
curl -fsS -m 10 -o /dev/null -w "GET / -> %{http_code}\n" "$URL/"
