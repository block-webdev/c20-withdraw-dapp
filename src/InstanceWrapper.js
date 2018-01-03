import React, { Component } from 'react'
import { PropTypes } from 'prop-types'
import getC20Instance from './utils/getC20Instance'
import { connect } from 'react-redux'
import { priceUpdate, loadUser, loadInitialPrice, getEtherPrice, loadUserBalance } from './actions'

class InstanceWrapper extends Component {
  constructor(props) {
    super(props)

    this.state = {
      instanceLoaded: false,
      accounts: null,
      web3: null,
      c20Instance: null,
    }
  }

  componentDidMount() {
    getC20Instance().then(result =>{
      this.setState((prevState, props) => (
        {
          ...this.state,
          instanceLoaded: true,
          accounts: result.accounts,
          web3: result.web3,
          c20Instance: result.c20Instance,
        })
      )

      const {
        dispatch
      } = this.props

      /////
      // Stuff that you want to happen every 30 seconds
      /////
      const every30Sec = ()=>{
        dispatch(getEtherPrice('usd'))

      }
      every30Sec()
      var timerID = setInterval(() => {
        every30Sec()
      }, 30 * 1000);

      /////
      // Load the users data:
      /////
      dispatch(loadUser(result.c20Instance, result.accounts))
      // NOTE:: the following function is not necessary since logs are sufficient.
      //        removing it will not break the app, here as a fallback.
      // dispatch(loadInitialPrice(result.c20Instance, result.web3, result.accounts))
      // NOTE:: below action is included in loadUser
      // dispatch(loadUserBalance(result.c20Instance, result.accounts[0]))

      /////
      // set up listeners on the contract.
      /////
      result.web3.eth.getBlock('latest')
      .then((block) => {
        // -800 blocks should be more than 2 hours ago, no need to go further in history.
        const startMonitorBlock = Math.max(0, block.number - 800)

        result.c20Instance.PriceUpdate(
          {}, { fromBlock: startMonitorBlock, toBlock: 'latest' }
        ).watch ( (err, response) => {
          console.log(response)
          const {
            transactionHash,
            blockNumber,
            args: {
              numerator,
              denominator,
            }
          } = response

          console.log('EVENT LOG(PriceUpdate):', {
            numerator: numerator.toString(),
            denominator: denominator.toString(),
          })

          dispatch(priceUpdate(
            numerator,
            denominator,
            transactionHash,
            blockNumber,
          ))
        })
      })
    })
  }

  getChildContext() {
    return this.state
  }

  render() {
    const { children } = this.props
    return (children && this.state.instanceLoaded) ? <div><p>testing</p>{React.Children.only(children)}</div> :
    <div>
    <h1>Connecting to Ethereum</h1>
    <h2>Please be patient</h2>
    </div>
  }
}

InstanceWrapper.childContextTypes = {
  instanceLoaded: PropTypes.bool,
  accounts: PropTypes.array,
  web3: PropTypes.object,
  c20Instance: PropTypes.object,
}

const mapStateToProps = state => ({
  user: state.user,
  price: state.price,
})

export default connect(mapStateToProps)(InstanceWrapper)
