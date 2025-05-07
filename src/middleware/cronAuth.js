import "dotenv/config"
export const checkCronAuth = (req,res,next) => {
     try {
        const {t:token} = req.query
        if (token !== process.env.CRON_SECRET)
            return res.status(401).json({error: 'Unauthorized'})
        next()
     } catch (error) {
        next(new Error(error))
     }
}