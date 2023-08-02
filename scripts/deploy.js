import { deployPoolseaPool } from '../test/_helpers/deployment';

deployPoolseaPool(false).then(function() {
    process.exit(0);
});