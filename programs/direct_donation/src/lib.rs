use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::invoke,
    system_instruction,
    system_program,
};

declare_id!("5ZWLcrXGpKmV7R7u4LpiVKmVcdEYc7trztEQqYYDvXyz");

#[program]
pub mod direct_donation {
    use super::*;

    // ----------------------------
    // Direct Donation (existing)
    // ----------------------------
    pub fn donate(ctx: Context<Donate>, amount: u64) -> Result<()> {
        let donor = &ctx.accounts.donor;
        let creator = &ctx.accounts.creator_wallet;
        let platform = &ctx.accounts.platform_wallet;

        // Calculate shares
        let total_amount = amount + (amount / 100); // Total amount including 1% fee
        let creator_share = amount; // 100% of the original amount
        let platform_share = amount / 100; // 1% of the original amount

        // Transfer 100% to creator
        invoke(
            &system_instruction::transfer(&donor.key(), &creator.key(), creator_share),
            &[
                donor.to_account_info(),
                creator.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Transfer 1% to platform
        invoke(
            &system_instruction::transfer(&donor.key(), &platform.key(), platform_share),
            &[
                donor.to_account_info(),
                platform.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    


    
}

// ----------------------------
// Account Definitions
// ----------------------------
#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,

    /// CHECK: This is a simple wallet receiving 99% of the donation.
    #[account(mut)]
    pub creator_wallet: AccountInfo<'info>,

    /// CHECK: This is the platform’s wallet receiving 1%.
    #[account(mut)]
    pub platform_wallet: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}



