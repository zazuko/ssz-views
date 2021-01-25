function middleware ({ store }) {
  return async (req, res, next) => {
    try {
      res.dataset(await store.view(req.absoluteUrl()))
    } catch (err) {
      return next(err)
    }
  }
}

export default middleware
