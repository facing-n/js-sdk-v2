import NinaClient from '../client';
import * as anchor from '@project-serum/anchor';
import { findOrCreateAssociatedTokenAccount } from '../utils';

/**
 * @module Hub
 */

/**
 * @function fetchAll
 * @description Fetches all hubs.
 * @param {Object} [pagination = {limit: 20, offset: 0, sort: 'desc'}] Pagination options.
 * @param {Boolean} [withAccountData = false] Include full on-chain Hub accounts.
 * @example const hubs = await NinaClient.Hub.fetchAll();
 */
const fetchAll = async (pagination = {}, withAccountData = false) => {
  const { limit, offset, sort } = pagination;
  return await NinaClient.get(
    '/hubs',
    {
      limit: limit || 20,
      offset: offset || 0,
      sort: sort || 'desc',
    },
    withAccountData
  );
};

/**
 * @function fetch
 * @description Fetches a Hub along with it's Releases, Collaborators, and Posts.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain Hub, HubRelease, HubPost, HubContent, HubCollaborator, Release, and Post accounts.
 * @example const hub = await NinaClient.Hub.fetch('ninas-picks');
 */
const fetch = async (publicKeyOrHandle, withAccountData=false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}`, undefined, withAccountData);
}

/**
 * @function fetchCollaborators
 * @description Fetches the Collaborators of a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubCollaborator accounts.
 * @example const collaborators = await NinaClient.Hub.fetchCollaborators('ninas-picks');
 */
const fetchCollaborators = async (publicKeyOrHandle) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/collaborators`);
}

/**
 * @function fetchReleases
 * @description Fetches Releases for a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubRelease, HubContent, and Release accounts.
 * @example const releases = await NinaClient.Hub.fetchReleases('ninas-picks');
 */
const fetchReleases = async (publicKeyOrHandle, withAccountData=false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/releases`, undefined, withAccountData);
}

/**
 * @function fetchPosts
 * @description Fetches Posts for a hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubPost, HubContent, and Post accounts.
 * @example const posts = await NinaClient.Hub.fetchPosts('ninas-picks');
 */
const fetchPosts = async (publicKeyOrHandle, withAccountData=false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/posts`, undefined, withAccountData);
}

/**
 * @function fetchHubRelease
 * @description Fetches a Release for a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub.
 * @param {String} hubReleasePublicKey The public key of the HubRelease.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubPost, HubContent, and Post accounts.
 * @example const hubRelease = await NinaClient.Hub.fetchHubRelease('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ);
 */  
const fetchHubRelease = async (publicKeyOrHandle, hubReleasePublicKey, withAccountData=false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/hubReleases/${hubReleasePublicKey}`, undefined, withAccountData);
}

/**
 * @function fetchHubPost
 * @description Fetches a hubPost
 * @param {String} publicKeyOrHandle The public key or handle of the Hub.
 * @param {String} hubPostPublicKey The public key of the HubPost.
 * @param {Boolean} [withAccountData = false] Include full on-chain HubPost, HubContent, and Post accounts.
 * @example const hubPost = await NinaClient.Hub.fetchHubPost('ninas-picks', 'H2aoAZfxbQX6s77yj31Duy7DiJnJcN3Gg1HkA2VuvNUZ');
 */
const fetchHubPost = async (publicKeyOrHandle, hubPostPublicKey, withAccountData=false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/hubPosts/${hubPostPublicKey}`, undefined, withAccountData);
}

/**
 * @function fetchSubscriptions
 * @description Fetches the subscriptions for a Hub.
 * @param {String} publicKeyOrHandle The public key or handle of the Hub account.
 * @example const subscriptions = await NinaClient.Hub.fetchSubscriptions("ninas-picks");
 */

const fetchSubscriptions = async (publicKeyOrHandle, withAccountData=false) => {
  return await NinaClient.get(`/hubs/${publicKeyOrHandle}/subscriptions`, undefined, withAccountData);
}

const hubInitWithCredit = async (hubParams, wallet, connection, ids) => {
  try {
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    })
    const program = await anchor.Program.at(ids.programs.nina, provider);  
    const USDC_MINT = new anchor.web3.PublicKey(ids.mints.usdc)
    const WRAPPED_SOL_MINT = new anchor.web3.PublicKey(ids.mints.wsol)
    const HUB_CREDIT_MINT = new anchor.web3.PublicKey(ids.mints.hubCredit)


    hubParams.publishFee = new anchor.BN(hubParams.publishFee * 10000)
    hubParams.referralFee = new anchor.BN(hubParams.referralFee * 10000)

    const [hub] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub')),
        Buffer.from(anchor.utils.bytes.utf8.encode(hubParams.handle)),
      ],
      program.programId
    )

    const [hubSigner, hubSignerBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-signer')),
          hub.toBuffer(),
        ],
        program.programId
      )

    hubParams.hubSignerBump = hubSignerBump

    const [hubCollaborator] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(anchor.utils.bytes.utf8.encode('nina-hub-collaborator')),
        hub.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    )

    let [, usdcVaultIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      hubSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      USDC_MINT
    )

    let [, wrappedSolVaultIx] = await findOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.publicKey,
      hubSigner,
      anchor.web3.SystemProgram.programId,
      anchor.web3.SYSVAR_RENT_PUBKEY,
      WRAPPED_SOL_MINT
    )

    let [authorityHubCreditTokenAccount] =
      await findOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.publicKey,
        provider.wallet.publicKey,
        anchor.web3.SystemProgram.programId,
        anchor.web3.SYSVAR_RENT_PUBKEY,
        HUB_CREDIT_MINT
      )

    const txid = await program.methods
      .hubInitWithCredit(hubParams)
      .accounts({
        authority: wallet.publicKey,
        hub,
        hubSigner,
        hubCollaborator,
        authorityHubCreditTokenAccount,
        hubCreditMint: HUB_CREDIT_MINT,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: new anchor.web3.PublicKey(ids.programs.token),
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .preInstructions([usdcVaultIx, wrappedSolVaultIx])
      .rpc()

    await connection.getParsedTransaction(txid, 'confirmed')
    await this.fetch(hub.toBase58())

    return hub.toBase58

  } catch (error) {
    console.log( error);
    return false
  }

}

export default {
  fetchAll,
  fetch,
  fetchCollaborators,
  fetchReleases,   
  fetchPosts,
  fetchHubRelease,
  fetchHubPost,
  fetchSubscriptions,
  hubInitWithCredit,
}
