# Setup

Don't forget to setup hook path correctly:

    git config --local core.hooksPath .githooks/

Ensure email is configured correctly:

    git config --local user.name name
    git config --local user.email name@gmail.com

# Misc

Rewrite committer history

    git filter-branch -f --commit-filter export GIT_AUTHOR_EMAIL=name@gmail.com; export GIT_AUTHOR_NAME=name; export GIT_COMMITTER_NAME=name; export GIT_COMMITTER_EMAIL=name@gmail.com; git commit-tree "$@"
