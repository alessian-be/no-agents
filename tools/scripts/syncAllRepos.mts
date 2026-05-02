import path from "node:path";

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { Octokit } from "octokit";
import { Config } from "../types/config.mjs";
import { RootDir } from "../index.mjs";

const token = process.env.POLICY_SYNC_TOKEN;
const owner = process.env.GITHUB_REPOSITORY_OWNER;

if (!token) {
  throw new Error("Missing POLICY_SYNC_TOKEN");
}

if (!owner) {
  throw new Error("Missing GITHUB_REPOSITORY_OWNER");
}

const octokit = new Octokit({ auth: token });

async function listFilesRecursively(directory: string): Promise<string[]> {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry);
    const fileStat = await stat(fullPath);

    if (fileStat.isDirectory()) {
      files.push(...(await listFilesRecursively(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

const sourceFiles = await listFilesRecursively(
  path.join(RootDir.pathname, Config.source),
);

for (const target of Config.targets) {
  console.log(`Syncing ${owner}/${target.repo}:${target.branch}`);

  const branchRef = await octokit.rest.git.getRef({
    owner,
    repo: target.repo,
    ref: `heads/${target.branch}`,
  });

  const currentCommitSha = branchRef.data.object.sha;

  const currentCommit = await octokit.rest.git.getCommit({
    owner,
    repo: target.repo,
    commit_sha: currentCommitSha,
  });

  const baseTreeSha = currentCommit.data.tree.sha;

  const tree = [];

  for (const sourceFile of sourceFiles) {
    const targetPath = relative(Config.source, sourceFile).replaceAll(
      "\\",
      "/",
    );
    const content = await readFile(sourceFile, "utf8");

    tree.push({
      path: targetPath,
      mode: "100644" as const,
      type: "blob" as const,
      content,
    });
  }

  const newTree = await octokit.rest.git.createTree({
    owner,
    repo: target.repo,
    base_tree: baseTreeSha,
    tree,
  });

  // const newCommit = await octokit.rest.git.createCommit({
  //   owner,
  //   repo: target.repo,
  //   message: "chore: sync shared policy files",
  //   tree: newTree.data.sha,
  //   parents: [currentCommitSha],
  //   author: {
  //     name: "alessian-be-ai-policy-bot",
  //     email: "alessian-be-ai-policy-bot@users.noreply.github.com",
  //   },
  //   committer: {
  //     name: "alessian-be-ai-policy-bot",
  //     email: "alessian-be-ai-policy-bot@users.noreply.github.com",
  //   },
  // });

  // await octokit.rest.git.updateRef({
  //   owner,
  //   repo: target.repo,
  //   ref: `heads/${target.branch}`,
  //   sha: newCommit.data.sha,
  // });

  // console.log(`Committed ${newCommit.data.sha} to ${target.repo}`);
}
