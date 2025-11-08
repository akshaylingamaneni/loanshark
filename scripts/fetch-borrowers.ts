import { getAllBorrowers } from "../lib/morpho/borrowers";
import { getMarkets } from "../lib/morpho/markets";

async function main() {
  console.log("Fetching markets from Morpho API...\n");

  const markets = await getMarkets([137]);
  console.log(`Found ${markets.length} markets on Polygon\n`);

  markets.forEach((market, index) => {
    console.log(
      `${index + 1}. ${market.collateralAsset!.symbol}/${market.loanAsset!.symbol} (${market.uniqueKey.slice(0, 10)}...)`
    );
  });

  console.log("\nFetching borrowers from all markets...\n");

  const borrowers = await getAllBorrowers(137);

  console.log(`Found ${borrowers.length} borrowers across all markets\n`);

  // borrowers.forEach((borrower, index) => {
  //   console.log(`${index + 1}. ${borrower.address}`);
  //   console.log(`   Market: ${borrower.marketKey.slice(0, 10)}...`);
  //   console.log(`   Borrow Assets: ${borrower.borrowAssets}`);
  //   console.log(`   Borrow Assets USD: ${borrower.borrowAssetsUsd ?? "N/A"}`);
  //   console.log(`   Borrow APY: ${(borrower.borrowApy * 100).toFixed(2)}%`);
  //   console.log("");
  // });
}

main().catch(console.error);

